function prepareTestNode() {
    var existingNode = document.getElementById("testNode");
    if (existingNode != null)
        existingNode.parentNode.removeChild(existingNode);
    testNode = document.createElement("div");
    testNode.id = "testNode";
    document.body.appendChild(testNode);
}


describe('Binding: Repeat', {
    before_each: prepareTestNode,

    'Should repeat node for specified number of times and have access to index through $index': function() {
        testNode.innerHTML = "<span data-bind=\"repeat: {count: 5, bind: 'text: $index'}\"></span>";
        ko.applyBindings(null, testNode);
        value_of(testNode).should_contain_text('01234');
    },

    'Should repeat node and descendants for specified number of times and have access to index through $index': function() {
        testNode.innerHTML = "<div data-bind='repeat: 5'><span data-bind='text: $index'></span></div>";
        ko.applyBindings(null, testNode);
        value_of(testNode).should_contain_text('01234');
    },

    'Should not repeat any nodes (and not bind them) if the value is falsey': function() {
        testNode.innerHTML = "<span data-bind='repeat: {foreach: someItem, bind: \"text: someItem.nonExistentChildProp\"}'></span>";
        value_of(testNode.childNodes.length).should_be(1);
        ko.applyBindings({ someItem: null }, testNode);
        value_of(testNode.childNodes.length).should_be(1);	// leaves placeholder comment node
        value_of(testNode.childNodes[0].nodeType).should_be(8);
    },

    'Should duplicate node for each value in the array value (and have access to value through $item())': function() {
        testNode.innerHTML = "<span data-bind='repeat: {foreach: someItems, bind: \"text: $item().childProp\"}'></span>";
        var someItems = [
            { childProp: 'first child' },
            { childProp: 'second child' }
        ];
        ko.applyBindings({ someItems: someItems }, testNode);
        value_of(testNode).should_contain_text('first childsecond child');
    },

    'Should be able to use \'with\' to create a child context': function() {
        testNode.innerHTML = "<div data-bind='repeat: {foreach: someItems, bind: \"with: $item()\"}'><span data-bind='text: childProp'></span></div>";
        var someItems = ko.observableArray([
            { childProp: 'first child' },
            { childProp: 'second child' }
        ]);
        ko.applyBindings({ someItems: someItems }, testNode);
        value_of(testNode).should_contain_text('first childsecond child');
        // add an item
        someItems.push({ childProp: 'last child' });
        value_of(testNode).should_contain_text('first childsecond childlast child');
    },

    'Should be able to use $index to reference each array item being bound': function() {
        testNode.innerHTML = "<span data-bind='repeat: {foreach: someItems, bind: \"text: someItems()[$index]\"}'></span>";
        var someItems = ko.observableArray(['alpha', 'beta']);
        ko.applyBindings({ someItems: someItems }, testNode);
        value_of(testNode).should_contain_text('alphabeta');
        // add an item
        someItems.push('gamma');
        value_of(testNode).should_contain_text('alphabetagamma');
    },

    'Should add and remove nodes to match changes in the bound array': function() {
        testNode.innerHTML = "<span data-bind='repeat: {foreach: someItems, bind: \"text: $item().childProp\"}'></span>";
        var someItems = ko.observableArray([
            { childProp: 'first child' },
            { childProp: 'second child' }
        ]);
        ko.applyBindings({ someItems: someItems }, testNode);
        value_of(testNode).should_contain_text('first childsecond child');

        // Add items at the beginning...
        someItems.unshift({ childProp: 'zeroth child' });
        value_of(testNode).should_contain_text('zeroth childfirst childsecond child');

        // ... middle
        someItems.splice(2, 0, { childProp: 'middle child' });
        value_of(testNode).should_contain_text('zeroth childfirst childmiddle childsecond child');

        // ... and end
        someItems.push({ childProp: 'last child' });
        value_of(testNode).should_contain_text('zeroth childfirst childmiddle childsecond childlast child');

        // Also remove from beginning...
        someItems.shift();
        value_of(testNode).should_contain_text('first childmiddle childsecond childlast child');

        // ... and middle
        someItems.splice(1, 1);
        value_of(testNode).should_contain_text('first childsecond childlast child');

        // ... and end
        someItems.pop();
        value_of(testNode).should_contain_text('first childsecond child');
    },

    'Should update all nodes corresponding to a changed array item, even if they were generated via containerless templates': function() {
        testNode.innerHTML = "<div data-bind='repeat: {foreach: someitems}'><!-- ko if:true --><span data-bind='text: $item()'></span><!-- /ko --></div>";
        var someitems = [ ko.observable('A'), ko.observable('B') ];
        ko.applyBindings({ someitems: someitems }, testNode);
        value_of(testNode).should_contain_text('AB');

        // Now update an item
        someitems[0]('A2');
        value_of(testNode).should_contain_text('A2B');
    },

    'Should be able to nest \'repeat\' and access binding contexts both during and after binding': function() {
        testNode.innerHTML = "<div data-bind='repeat: {foreach: items}'>"
                                + "<div data-bind='repeat: {foreach: $item().children, item: \"$child\"}'>"
                                    + "(Val: <span data-bind='text: $child()'></span>)"
                                + "</div>"
                           + "</div>";
        var viewModel = {
            rootVal: 'ROOTVAL',
            items: ko.observableArray([
                { children: ko.observableArray(['A1', 'A2', 'A3']) },
                { children: ko.observableArray(['B1', 'B2']) }
            ])
        };
        ko.applyBindings(viewModel, testNode);

        // Verify we can access binding contexts during binding
        value_of(testNode.childNodes[1]).should_contain_text("(Val: A1)(Val: A2)(Val: A3)");
        value_of(testNode.childNodes[2]).should_contain_text("(Val: B1)(Val: B2)");

        // Verify we can access them later
        var firstInnerTextNode = testNode.childNodes[1].childNodes[1].childNodes[1];
        value_of(firstInnerTextNode.nodeType).should_be(1); // The first span associated with A1
        value_of(ko.contextFor(firstInnerTextNode).$child()).should_be("A1");
        value_of(ko.contextFor(firstInnerTextNode).$root.rootVal).should_be("ROOTVAL");
    },

    'Should be able to use \'repeat\' in UL elements even when closing LI tags are omitted' : function() {
        testNode.innerHTML =   "<ul><li>Header item<li data-bind='repeat: {foreach: someitems, bind: \"text: $item()\"}'></ul>";
        var viewModel = {
            someitems: [ 'Alpha', 'Beta' ]
        };
        ko.applyBindings(viewModel, testNode);

        value_of(testNode).should_contain_text("Header itemAlphaBeta");
    }
});
